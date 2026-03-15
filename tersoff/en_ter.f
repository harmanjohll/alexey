
!   this computes the energy using the Tersoff potential   
!   PRB 39, 5566 (1989)


            subroutine en_ter


            use common1


            implicit none

      integer        patom
      parameter      (patom=tatom)

      integer        iatom,iatom1,iatom2,w1a,w2a,w3a,w4a,
     &               w1,w2,w3,w4,i,j,k,l,ibox1,ibox2,
     &               w1b,w2b,w3b,w4b,w1c,w2c,w3c,w4c,
     &               s1,s2,s3,s1a,s2a,s1b,s2b,pick


      real(r8_kind)  rdum,rdumx,rdumy,rdumz,edum,edump,qdum,
     &               epair,etrip,
     &               fdum,gdum,zetaij,bij,gijk

 
      integer        mpair,iatpair(2,tpair)

      real(r8_kind)  frij(tpair),faij(tpair),fcij(tpair),
     &               rpair(tpair),xpair(tpair),
     &               ypair(tpair),zpair(tpair)

      integer        mtrip,pa,pb,addtrip,npart(tatom),
     &               ipart(patom,tatom),ndum1,ndum2

      real(r8_kind)  xp(patom,tatom),yp(patom,tatom),
     &               zp(patom,tatom),rp(patom,tatom),
     &               fcp(patom,tatom),fap(patom,tatom),
     &               frp(patom,tatom)
        
      real(r8_kind)  dot,angle

      real(r8_kind)  xijt,yijt,zijt,rijt,fcijt,faijt,frijt,
     &               xikt,yikt,zikt,rikt,fcikt,faikt,frikt


!           computing energy of initial configuration
            do i=1,natom
             npart(i)=0
             do j=1,patom
              ipart(j,i)=0
              xp(j,i)=0.0
              yp(j,i)=0.0
              zp(j,i)=0.0
              rp(j,i)=0.0
              fcp(j,i)=0.0
              fap(j,i)=0.0
              frp(j,i)=0.0
             enddo
            enddo

	do i=1,tpair
	 frij(i)=0
	 faij(i)=0
	 fcij(i)=0
	 rpair(i)=0
	 xpair(i)=0
	 ypair(i)=0
	 zpair(i)=0
	end do

	do j=1,tpair
	 do i=1,2
	  iatpair(i,j)=0
	 end do
	end do
	
            epair=0.0
            etrip=0.0

!           constructing atom-pairs

            mpair=0

            write(20,*) 'PAIRS'
            do ibox1=1,nbox

            do iatom1=1,natbox(ibox1)-1
            do iatom2=iatom1+1,natbox(ibox1)

              w1=iatbox(iatom1,ibox1)
              w2=iatbox(iatom2,ibox1)
              s1=satom(w1)
              s2=satom(w2)

                    rdumx=(dxpos(w2)-dxpos(w1))
                    if (rdumx.gt.(totlx/2.0)) then
                      rdumx=rdumx-totlx
                    else if (rdumx.lt.-(totlx/2.0)) then
                      rdumx=rdumx+totlx
                    end if

                    rdumy=(dypos(w2)-dypos(w1))
                    if (rdumy.gt.(totly/2.0)) then
                      rdumy=rdumy-totly
                    else if (rdumy.lt.-(totly/2.0)) then
                      rdumy=rdumy+totly
                    end if

                    rdumz=(dzpos(w2)-dzpos(w1))
                    if (rdumz.gt.(totlz/2.0)) then
                      rdumz=rdumz-totlz
                    else if (rdumz.lt.-(totlz/2.0)) then
                      rdumz=rdumz+totlz
                    end if

                    rdum=(rdumx*rdumx)+(rdumy*rdumy)+(rdumz*rdumz)
                    rdum=sqrt(rdum)

                    rcutsmall=rcap(s1,s2)
                    rcut=scap(s1,s2)

                    if (rdum.lt.rcut) then         ! rcut here is Sij
                       mpair=mpair+1

                       iatpair(1,mpair)=w1
                       iatpair(2,mpair)=w2

                       xpair(mpair)=rdumx
                       ypair(mpair)=rdumy
                       zpair(mpair)=rdumz
                       rpair(mpair)=rdum

                       frij(mpair)=acap(s1,s2)*exp(-lambij(s1,s2)*rdum)
                       faij(mpair)=-bcap(s1,s2)*exp(-muij(s1,s2)*rdum)

                       if (rdum.lt.rcutsmall) then
                         fcij(mpair)=1.0
                       else
                         fdum=pi*(rdum-rcutsmall)/(rcut-rcutsmall)
                         fcij(mpair)=0.5+(0.5*cos(fdum))
                       end if


        ndum1=npart(w1)+1
        npart(w1)=ndum1
        ipart(ndum1,w1)=w2
        xp(ndum1,w1)=rdumx
        yp(ndum1,w1)=rdumy
        zp(ndum1,w1)=rdumz
        rp(ndum1,w1)=rdum
        fcp(ndum1,w1)=fcij(mpair)
        fap(ndum1,w1)=faij(mpair)
        frp(ndum1,w1)=frij(mpair)

        ndum2=npart(w2)+1
        npart(w2)=ndum2
        ipart(ndum2,w2)=w1
        xp(ndum2,w2)=-rdumx
        yp(ndum2,w2)=-rdumy
        zp(ndum2,w2)=-rdumz
        rp(ndum2,w2)=rdum
        fcp(ndum2,w2)=fcij(mpair)
        fap(ndum2,w2)=faij(mpair)
        frp(ndum2,w2)=frij(mpair)
        
!                      note that the summation here is over distinct pairs
!                      so the factor of 1/2 in Tersoff's formula is not needed.



!       if w1 or w2 or both selected for switch 
        if (w1.eq.catom1.or.w1.eq.catom2.or.
     &      w2.eq.catom1.or.w2.eq.catom2) then
          edum=fcij(mpair)*frij(mpair)
          epair=epair+edum                      !  note negative sign here
        end if


        end if  ! atoms within rcut

        enddo
        enddo

        enddo




!           pairs from different boxes
            do i=1,npair
             ibox1=ibxp(1,i)
             ibox2=ibxp(2,i)

            do iatom1=1,natbox(ibox1)
            do iatom2=1,natbox(ibox2)

              w1=iatbox(iatom1,ibox1)
              w2=iatbox(iatom2,ibox2)
              s1=satom(w1)
              s2=satom(w2)

                    rdumx=(dxpos(w2)-dxpos(w1))
                        rdumx=(dxpos(w2)-dxpos(w1))
                    if (rdumx.gt.(totlx/2.0)) then
                      rdumx=rdumx-totlx
                    else if (rdumx.lt.-(totlx/2.0)) then
                      rdumx=rdumx+totlx
                    end if

                    rdumy=(dypos(w2)-dypos(w1))
                    if (rdumy.gt.(totly/2.0)) then
                      rdumy=rdumy-totly
                    else if (rdumy.lt.-(totly/2.0)) then
                      rdumy=rdumy+totly
                    end if

                    rdumz=(dzpos(w2)-dzpos(w1))
                    if (rdumz.gt.(totlz/2.0)) then
                      rdumz=rdumz-totlz
                    else if (rdumz.lt.-(totlz/2.0)) then
                      rdumz=rdumz+totlz
                    end if

                    rdum=(rdumx*rdumx)+(rdumy*rdumy)+(rdumz*rdumz)
                    rdum=sqrt(rdum)

                    rcutsmall=rcap(s1,s2)
                    rcut=scap(s1,s2)

                    if (rdum.lt.rcut) then         ! rcut here is Sij
                       mpair=mpair+1

                       iatpair(1,mpair)=w1
                       iatpair(2,mpair)=w2

                       xpair(mpair)=rdumx
                       ypair(mpair)=rdumy
                       zpair(mpair)=rdumz
                       rpair(mpair)=rdum

                       frij(mpair)=acap(s1,s2)*exp(-lambij(s1,s2)*rdum)
                       faij(mpair)=-bcap(s1,s2)*exp(-muij(s1,s2)*rdum)

                       if (rdum.lt.rcutsmall) then
                         fcij(mpair)=1.0
                       else
                         fdum=pi*(rdum-rcutsmall)/(rcut-rcutsmall)
                         fcij(mpair)=0.5+(0.5*cos(fdum))
                       end if


                       ndum1=npart(w1)+1
                       npart(w1)=ndum1
                       ipart(ndum1,w1)=w2
                       xp(ndum1,w1)=rdumx
                       yp(ndum1,w1)=rdumy
                       zp(ndum1,w1)=rdumz
                       rp(ndum1,w1)=rdum
                       fcp(ndum1,w1)=fcij(mpair)
                       fap(ndum1,w1)=faij(mpair)
                       frp(ndum1,w1)=frij(mpair)

                       ndum2=npart(w2)+1
                       npart(w2)=ndum2
                       ipart(ndum2,w2)=w1
                       xp(ndum2,w2)=-rdumx
                       yp(ndum2,w2)=-rdumy
                       zp(ndum2,w2)=-rdumz
                       rp(ndum2,w2)=rdum
                       fcp(ndum2,w2)=fcij(mpair)
                       fap(ndum2,w2)=faij(mpair)
                       frp(ndum2,w2)=frij(mpair)
        
!                      note that the summation here is over distinct pairs
!                      so the factor of 1/2 in Tersoff's formula is not needed.



!                   w1 or w2 or both selected for switch 
                    if (w1.eq.catom1.or.w1.eq.catom2.or.
     &                  w2.eq.catom1.or.w2.eq.catom2) then
                      edum=fcij(mpair)*frij(mpair)
                      epair=epair+edum                      !  note negative sign here
                    end if


                    end if  ! atoms within rcut


            enddo
            enddo

            enddo



         
            mtrip=0
 

            write(20,*) 'TRIPS'

            do pa=1,mpair


!           first orientation of pair first atom as central atom           
              w1=iatpair(1,pa)      ! w1 is atom i
              w2=iatpair(2,pa)      ! w2 is atom j
              s1=satom(w1) 
              s2=satom(w2)

              pick=0
              do pb=1,npart(w1)
                w3=ipart(pb,w1)
                if (w3.eq.catom1.or.w3.eq.catom2) then
                 pick=1
                 go to 101
                end if
              enddo

!             At least one of w1, w2, w3 switched
101           if (w1.eq.catom1.or.w1.eq.catom2.or.
     &            w2.eq.catom1.or.w2.eq.catom2.or.
     &            pick.eq.1) then
              

              xijt=xpair(pa)
              yijt=ypair(pa)
              zijt=zpair(pa)
              rijt=rpair(pa)
              fcijt=fcij(pa)
              faijt=faij(pa)
              frijt=frij(pa)

              zetaij=0.0
              do pb=1,npart(w1)
                
                w3=ipart(pb,w1)
                s3=satom(w3)
                if (w3.ne.w2) then

                xikt=xp(pb,w1)
                yikt=yp(pb,w1)
                zikt=zp(pb,w1)
                rikt=rp(pb,w1)
                fcikt=fcp(pb,w1)
                faikt=fap(pb,w1)
                frikt=frp(pb,w1)

                dot=(xijt*xikt)
     &             +(yijt*yikt)
     &             +(zijt*zikt)
                angle=dot/(rijt*rikt)     ! angle is cosine(theta_jik)

                gdum=(d(s1)**2)+((h(s1)-angle)**2)
                gdum=(c(s1)**2)/gdum
                gijk=1.0+((c(s1)/d(s1))**2)-gdum

                zetaij=zetaij+(fcikt*omega(s1,s3)*gijk)

                end if      !    w2 ne w3
              enddo         !   looping over partners of w1        

         bij=(1.0+((beta(s1)*zetaij)**nexp(s1)))**(-0.5/nexp(s1))
         bij=chi(s1,s2)*bij

         edum=0.5*fcijt*bij*faijt     
                            ! Tersoff's factor
                            ! of 1/2 needed here because bond ij
                            ! is counted once with i at center
                            ! and once with j at center

         etrip=etrip+edum

         call flush(20)

         end if             ! w1 or w2 or w3 switched



!           second orientation of pair second atom as central atom           
              w2=iatpair(1,pa)      ! w2 is atom j
              w1=iatpair(2,pa)      ! w1 is atom i
              s1=satom(w1) 
              s2=satom(w2)


              pick=0
              do pb=1,npart(w1)
                w3=ipart(pb,w1)
                if (w3.eq.catom1.or.w3.eq.catom2) then
                 pick=1
                 go to 102
                end if
              enddo

!             At least one of w1, w2, w3 switched
102           if (w1.eq.catom1.or.w1.eq.catom2.or.
     &            w2.eq.catom1.or.w2.eq.catom2.or.
     &            pick.eq.1) then
              

              xijt=-xpair(pa)
              yijt=-ypair(pa)
              zijt=-zpair(pa)
              rijt=rpair(pa)
              fcijt=fcij(pa)
              faijt=faij(pa)
              frijt=frij(pa)

              zetaij=0.0
              do pb=1,npart(w1)
                
                w3=ipart(pb,w1)
                s3=satom(w3)
                if (w3.ne.w2) then

                xikt=xp(pb,w1)
                yikt=yp(pb,w1)
                zikt=zp(pb,w1)
                rikt=rp(pb,w1)
                fcikt=fcp(pb,w1)
                faikt=fap(pb,w1)
                frikt=frp(pb,w1)

                dot=(xijt*xikt)
     &             +(yijt*yikt)
     &             +(zijt*zikt)
                angle=dot/(rijt*rikt)     ! angle is cosine(theta_jik)

                gdum=(d(s1)**2)+((h(s1)-angle)**2)
                gdum=(c(s1)**2)/gdum
                gijk=1.0+((c(s1)/d(s1))**2)-gdum

                zetaij=zetaij+(fcikt*omega(s1,s3)*gijk)

                end if      !    w2 ne w3
              enddo         !   looping over partners of w1        

         bij=(1.0+((beta(s1)*zetaij)**nexp(s1)))**(-0.5/nexp(s1))
         bij=chi(s1,s2)*bij

         edum=0.5*fcijt*bij*faijt     
                            ! Tersoff's factor
                            ! of 1/2 needed here because bond ij
                            ! is counted once with i at center
                            ! and once with j at center

         etrip=etrip+edum

         call flush(20)

         end if             ! w1 or w2 or w3 switched
 
         enddo         ! loop over pa

         e2=-epair
         e3=-etrip


!           computing energy of final configuration


            satom(catom1)=s1f
            satom(catom2)=s2f

            do i=1,natom
             npart(i)=0
             do j=1,patom
              ipart(j,i)=0
              xp(j,i)=0.0
              yp(j,i)=0.0
              zp(j,i)=0.0
              rp(j,i)=0.0
              fcp(j,i)=0.0
              fap(j,i)=0.0
              frp(j,i)=0.0
             enddo
            enddo

	do i=1,tpair
	 frij(i)=0
	 faij(i)=0
	 fcij(i)=0
	 rpair(i)=0
	 xpair(i)=0
	 ypair(i)=0
	 zpair(i)=0
	end do

	do j=1,tpair
	 do i=1,2
	  iatpair(i,j)=0
	 end do
	end do


            epair=0.0
            etrip=0.0

!           constructing atom-pairs

            mpair=0

            write(20,*) 'PAIRS'
            do ibox1=1,nbox

            do iatom1=1,natbox(ibox1)-1
            do iatom2=iatom1+1,natbox(ibox1)

              w1=iatbox(iatom1,ibox1)
              w2=iatbox(iatom2,ibox1)
              s1=satom(w1)
              s2=satom(w2)

                    rdumx=(dxpos(w2)-dxpos(w1))
                    if (rdumx.gt.(totlx/2.0)) then
                      rdumx=rdumx-totlx
                    else if (rdumx.lt.-(totlx/2.0)) then
                      rdumx=rdumx+totlx
                    end if

                    rdumy=(dypos(w2)-dypos(w1))
                    if (rdumy.gt.(totly/2.0)) then
                      rdumy=rdumy-totly
                    else if (rdumy.lt.-(totly/2.0)) then
                      rdumy=rdumy+totly
                    end if

                    rdumz=(dzpos(w2)-dzpos(w1))
                    if (rdumz.gt.(totlz/2.0)) then
                      rdumz=rdumz-totlz
                    else if (rdumz.lt.-(totlz/2.0)) then
                      rdumz=rdumz+totlz
                    end if

                    rdum=(rdumx*rdumx)+(rdumy*rdumy)+(rdumz*rdumz)
                    rdum=sqrt(rdum)

                    rcutsmall=rcap(s1,s2)
                    rcut=scap(s1,s2)

                    if (rdum.lt.rcut) then         ! rcut here is Sij
                       mpair=mpair+1

                       iatpair(1,mpair)=w1
                       iatpair(2,mpair)=w2

                       xpair(mpair)=rdumx
                       ypair(mpair)=rdumy
                       zpair(mpair)=rdumz
                       rpair(mpair)=rdum

                       frij(mpair)=acap(s1,s2)*exp(-lambij(s1,s2)*rdum)
                       faij(mpair)=-bcap(s1,s2)*exp(-muij(s1,s2)*rdum)

                       if (rdum.lt.rcutsmall) then
                         fcij(mpair)=1.0
                       else
                         fdum=pi*(rdum-rcutsmall)/(rcut-rcutsmall)
                         fcij(mpair)=0.5+(0.5*cos(fdum))
                       end if


        ndum1=npart(w1)+1
        npart(w1)=ndum1
        ipart(ndum1,w1)=w2
        xp(ndum1,w1)=rdumx
        yp(ndum1,w1)=rdumy
        zp(ndum1,w1)=rdumz
        rp(ndum1,w1)=rdum
        fcp(ndum1,w1)=fcij(mpair)
        fap(ndum1,w1)=faij(mpair)
        frp(ndum1,w1)=frij(mpair)

        ndum2=npart(w2)+1
        npart(w2)=ndum2
        ipart(ndum2,w2)=w1
        xp(ndum2,w2)=-rdumx
        yp(ndum2,w2)=-rdumy
        zp(ndum2,w2)=-rdumz
        rp(ndum2,w2)=rdum
        fcp(ndum2,w2)=fcij(mpair)
        fap(ndum2,w2)=faij(mpair)
        frp(ndum2,w2)=frij(mpair)
        
!                      note that the summation here is over distinct pairs
!                      so the factor of 1/2 in Tersoff's formula is not needed.



!       if w1 or w2 or both selected for switch 
        if (w1.eq.catom1.or.w1.eq.catom2.or.
     &      w2.eq.catom1.or.w2.eq.catom2) then
          edum=fcij(mpair)*frij(mpair)
          epair=epair+edum                      !  note negative sign here
        end if


        end if  ! atoms within rcut

        enddo
        enddo

        enddo




!           pairs from different boxes
            do i=1,npair
             ibox1=ibxp(1,i)
             ibox2=ibxp(2,i)

            do iatom1=1,natbox(ibox1)
            do iatom2=1,natbox(ibox2)

              w1=iatbox(iatom1,ibox1)
              w2=iatbox(iatom2,ibox2)
              s1=satom(w1)
              s2=satom(w2)

                    rdumx=(dxpos(w2)-dxpos(w1))
                        rdumx=(dxpos(w2)-dxpos(w1))
                    if (rdumx.gt.(totlx/2.0)) then
                      rdumx=rdumx-totlx
                    else if (rdumx.lt.-(totlx/2.0)) then
                      rdumx=rdumx+totlx
                    end if

                    rdumy=(dypos(w2)-dypos(w1))
                    if (rdumy.gt.(totly/2.0)) then
                      rdumy=rdumy-totly
                    else if (rdumy.lt.-(totly/2.0)) then
                      rdumy=rdumy+totly
                    end if

                    rdumz=(dzpos(w2)-dzpos(w1))
                    if (rdumz.gt.(totlz/2.0)) then
                      rdumz=rdumz-totlz
                    else if (rdumz.lt.-(totlz/2.0)) then
                      rdumz=rdumz+totlz
                    end if

                    rdum=(rdumx*rdumx)+(rdumy*rdumy)+(rdumz*rdumz)
                    rdum=sqrt(rdum)

                    rcutsmall=rcap(s1,s2)
                    rcut=scap(s1,s2)

                    if (rdum.lt.rcut) then         ! rcut here is Sij
                       mpair=mpair+1

                       iatpair(1,mpair)=w1
                       iatpair(2,mpair)=w2

                       xpair(mpair)=rdumx
                       ypair(mpair)=rdumy
                       zpair(mpair)=rdumz
                       rpair(mpair)=rdum

                       frij(mpair)=acap(s1,s2)*exp(-lambij(s1,s2)*rdum)
                       faij(mpair)=-bcap(s1,s2)*exp(-muij(s1,s2)*rdum)

                       if (rdum.lt.rcutsmall) then
                         fcij(mpair)=1.0
                       else
                         fdum=pi*(rdum-rcutsmall)/(rcut-rcutsmall)
                         fcij(mpair)=0.5+(0.5*cos(fdum))
                       end if


                       ndum1=npart(w1)+1
                       npart(w1)=ndum1
                       ipart(ndum1,w1)=w2
                       xp(ndum1,w1)=rdumx
                       yp(ndum1,w1)=rdumy
                       zp(ndum1,w1)=rdumz
                       rp(ndum1,w1)=rdum
                       fcp(ndum1,w1)=fcij(mpair)
                       fap(ndum1,w1)=faij(mpair)
                       frp(ndum1,w1)=frij(mpair)

                       ndum2=npart(w2)+1
                       npart(w2)=ndum2
                       ipart(ndum2,w2)=w1
                       xp(ndum2,w2)=-rdumx
                       yp(ndum2,w2)=-rdumy
                       zp(ndum2,w2)=-rdumz
                       rp(ndum2,w2)=rdum
                       fcp(ndum2,w2)=fcij(mpair)
                       fap(ndum2,w2)=faij(mpair)
                       frp(ndum2,w2)=frij(mpair)
        
!                      note that the summation here is over distinct pairs
!                      so the factor of 1/2 in Tersoff's formula is not needed.



!                   w1 or w2 or both selected for switch 
                    if (w1.eq.catom1.or.w1.eq.catom2.or.
     &                  w2.eq.catom1.or.w2.eq.catom2) then
                      edum=fcij(mpair)*frij(mpair)
                      epair=epair+edum                      !  note negative sign here
                    end if


                    end if  ! atoms within rcut


            enddo
            enddo

            enddo



         
            mtrip=0
 

            write(20,*) 'TRIPS'

            do pa=1,mpair


!           first orientation of pair first atom as central atom           
              w1=iatpair(1,pa)      ! w1 is atom i
              w2=iatpair(2,pa)      ! w2 is atom j
              s1=satom(w1) 
              s2=satom(w2)

              pick=0
              do pb=1,npart(w1)
                w3=ipart(pb,w1)
                if (w3.eq.catom1.or.w3.eq.catom2) then
                 pick=1
                 go to 201
                end if
              enddo

!             At least one of w1, w2, w3 switched
201           if (w1.eq.catom1.or.w1.eq.catom2.or.
     &            w2.eq.catom1.or.w2.eq.catom2.or.
     &            pick.eq.1) then
              

              xijt=xpair(pa)
              yijt=ypair(pa)
              zijt=zpair(pa)
              rijt=rpair(pa)
              fcijt=fcij(pa)
              faijt=faij(pa)
              frijt=frij(pa)

              zetaij=0.0
              do pb=1,npart(w1)
                
                w3=ipart(pb,w1)
                s3=satom(w3)
                if (w3.ne.w2) then

                xikt=xp(pb,w1)
                yikt=yp(pb,w1)
                zikt=zp(pb,w1)
                rikt=rp(pb,w1)
                fcikt=fcp(pb,w1)
                faikt=fap(pb,w1)
                frikt=frp(pb,w1)

                dot=(xijt*xikt)
     &             +(yijt*yikt)
     &             +(zijt*zikt)
                angle=dot/(rijt*rikt)     ! angle is cosine(theta_jik)

                gdum=(d(s1)**2)+((h(s1)-angle)**2)
                gdum=(c(s1)**2)/gdum
                gijk=1.0+((c(s1)/d(s1))**2)-gdum

                zetaij=zetaij+(fcikt*omega(s1,s3)*gijk)

                end if      !    w2 ne w3
              enddo         !   looping over partners of w1        

         bij=(1.0+((beta(s1)*zetaij)**nexp(s1)))**(-0.5/nexp(s1))
         bij=chi(s1,s2)*bij

         edum=0.5*fcijt*bij*faijt     
                            ! Tersoff's factor
                            ! of 1/2 needed here because bond ij
                            ! is counted once with i at center
                            ! and once with j at center

         etrip=etrip+edum

         call flush(20)

         end if             ! w1 or w2 or w3 switched



!           second orientation of pair second atom as central atom           
              w2=iatpair(1,pa)      ! w2 is atom j
              w1=iatpair(2,pa)      ! w1 is atom i
              s1=satom(w1) 
              s2=satom(w2)


              pick=0
              do pb=1,npart(w1)
                w3=ipart(pb,w1)
                if (w3.eq.catom1.or.w3.eq.catom2) then
                 pick=1
                 go to 202
                end if
              enddo

!             At least one of w1, w2, w3 switched
202           if (w1.eq.catom1.or.w1.eq.catom2.or.
     &            w2.eq.catom1.or.w2.eq.catom2.or.
     &            pick.eq.1) then
              

              xijt=-xpair(pa)
              yijt=-ypair(pa)
              zijt=-zpair(pa)
              rijt=rpair(pa)
              fcijt=fcij(pa)
              faijt=faij(pa)
              frijt=frij(pa)

              zetaij=0.0
              do pb=1,npart(w1)
                
                w3=ipart(pb,w1)
                s3=satom(w3)
                if (w3.ne.w2) then

                xikt=xp(pb,w1)
                yikt=yp(pb,w1)
                zikt=zp(pb,w1)
                rikt=rp(pb,w1)
                fcikt=fcp(pb,w1)
                faikt=fap(pb,w1)
                frikt=frp(pb,w1)

                dot=(xijt*xikt)
     &             +(yijt*yikt)
     &             +(zijt*zikt)
                angle=dot/(rijt*rikt)     ! angle is cosine(theta_jik)

                gdum=(d(s1)**2)+((h(s1)-angle)**2)
                gdum=(c(s1)**2)/gdum
                gijk=1.0+((c(s1)/d(s1))**2)-gdum

                zetaij=zetaij+(fcikt*omega(s1,s3)*gijk)

                end if      !    w2 ne w3
              enddo         !   looping over partners of w1        

         bij=(1.0+((beta(s1)*zetaij)**nexp(s1)))**(-0.5/nexp(s1))
         bij=chi(s1,s2)*bij

         edum=0.5*fcijt*bij*faijt     
                            ! Tersoff's factor
                            ! of 1/2 needed here because bond ij
                            ! is counted once with i at center
                            ! and once with j at center

         etrip=etrip+edum

         call flush(20)

         end if             ! w1 or w2 or w3 switched
 
         enddo         ! loop over pa

         satom(catom1)=s1i
         satom(catom2)=s2i


         e2=e2+epair
         e3=e3+etrip

         return
         end subroutine en_ter
