            use common1

            implicit none          


            integer   i,j,k,iiter1,iiter2,iiter3,iiter4
            integer   niter1,niter2,niter3,niter4
  
            integer   idum,jdum,kdum,idum1,idum2,ndum

            integer   deli,delj,delk,ibox1,ibox2

            integer   iatom,nmax,nmin,nswitch,nswitch1,bath1,bath2

            real(r8_kind)  rdum,xdum,ydum,zdum,rmax
 
            real(r8_kind) rdum1,rdum2,rdum3,rdum4,rdum5,rdum6,pdum
   
            real(r8_kind)  mass1,mass2,theta1,elo

            integer   ncount(nstep),nstop

            integer   struc,nsi,nge,nset,sset(tatom),iset(tatom)

            integer   nsurf,itemp(tatom)

            real(r8_kind) xtemp(tatom),ytemp(tatom),ztemp(tatom)

            real(r8_kind) ran3,dmass1,dmass2,temperature

	    real(r8_kind) run_sum_a,run_sum_b,run_sum_c
	    
	    real(r8_kind) run_sum_d,run_sum_e,e5

       open(20,file='LOG',status='new')
       open(30,file='ENERGY',status='new')
       open(40,file='OUTPOS',status='new')
       open(50,file='VELOCITY',status='new')
       open(60,file='GE_DISTRIBUTION',status='new')
       open(777,file='COMP',status='new')
       open(912,file='AVE_ENERGY',status='new')
       open(913,file='INPOS',status='new')
       open(62,file='SI_DISTRIBUTION',status='new')
       open(996,file='check',status='new')
       open(888,file='TEMPERATURE',status='new')
       write(20,*) 'start program'
       call flush(20)


       write(777,556)
556    format (1x,'Si',8x,'Ge')
       

!       set up STOP file; maximum niter1 is set to 1000000 here
        nstop=1000000
        open(51,file='STOP',status='new')
        write(51,*) nstop
        close(51)


       write(20,*) 'reading input'
       call flush(20)

!      read in physical parameters
       open(10,file='input',status='old')
         read(10,*) seed
         read(10,*) struc
         read(10,*) niter1,niter2,niter3,niter4
         read(10,*) temp,wbath      ! read in temperature in K and convert to 2kBT
         read(10,*) epsilon0,dtime0,mtime,dispcut
         read(10,*) mass1,mass2,theta1
         read(10,*) nset
         if (nset.ge.1) then
           do i=1,nset
            read(10,*) iset(i),sset(i)
           enddo
         end if

         read(10,*) mu_si,mu_ge

         read(10,*) nsurf
         if (nsurf.gt.0) then
           do i=1,nsurf
             read(10,*) itemp(i),xtemp(i),ytemp(i),ztemp(i) 
           enddo
         end if

       close(10)

       elo=100000.0


!      constants
       pi=acos(-1.0)
       write(20,*) 'pi ',pi
 

!      unit of temperature K
!      unit of energy      eV
!      unit of length      Angstrom
!      unit of mass       amu
!      unit of force      eV/A 
!      unit of time       Angstrom*(amu/eV)^(1/2) = tau
!           to convert into seconds  
!           multiply by 10^-10 * [(10^-3/6.02214*10^23) / (1.60218*10^-19)]^(1/2)
!          = 1.01804956609 * 10^-14 s

!      unit of velocity   A/tau = (eV/amu)^(1/2)
!           to convert into ms-1
!           multiply by [(10^-3/6.02214*10^23) / (1.60218*10^-19)]^(-1/2)
!          = 9822.70444694 ms-1

!      unit of acceleration A/(tau^2)



!      kB = 1.38044 * 10^-23 J/K = 0.86166560553 * 10^-4 eV/K


       beta1=0.86166560553e-4*temp      !   this gives kT in units of eV
       beta2=beta1*2.0            ! this is 2kT

       vscale=beta2       ! for use in rescaling velocities
    
       write(20,*) 'vscale ',vscale




!           read in all parameters for the potential
       write(20,*) 'reading pot'


!      parameters for the mfvf potential
!       open(10,file='pot',status='old')
!         read(10,*) rcut
!         write(20,*) 'rcut       ',rcut
!         call flush(20)
!
!         read(10,*) alpha,gamma
!         write(20,*) 'alpha,gamma',alpha,gamma
!         call flush(20)
!
!         read(10,*) a,b,q
!         write(20,*) 'a,b,q      ',a,b,q
!         call flush(20)
!
!         read(10,*) lamb3,lamb4,olamb4
!         write(20,*) 'lamb3,lamb4',lamb3,lamb4,olamb4
!         call flush(20)
!
!       close(10)


!      parameters for the bg potential
!       open(10,file='pot',status='old')
!         read(10,*) rcut,qcut
!         write(20,*) 'rcut and qcut ',rcut,qcut
!         call flush(20)
!
!         read(10,*) acap,b
!         write(20,*) 'acap  and b   ',acap,b
!         call flush(20)
!
!         read(10,*) a
!         write(20,*) 'a             ',a
!         call flush(20)
!
!         read(10,*) a1,a2
!         write(20,*) 'a1 and a2     ',a1,a2
!         call flush(20)
!
!         read(10,*) d1,d2
!         write(20,*) 'd1 and d2     ',d1,d2
!         call flush(20)
!
!         gamma2=((rcut*rcut)-(3*a*a))/d1
!         gamma3=qcut/d2
!
!        close(10)

!       parameters for the modified sw potential
!        open(10,file='pot',status='old')
!
!        read(10,*) eps,sigma
!        write(20,*) 'eps and sigma ',eps,sigma
!
!        read(10,*) acap,bcap
!        write(20,*) 'acap and bcap ',acap,bcap
!
!        read(10,*) zeta,gamma,lambda
!        write(20,*) 'zeta,gamma,lambda',zeta,gamma,lambda
!
!        read(10,*) b,c,k
!        write(20,*) 'b c k ',b,c,k
!
!        read(10,*) rrcut
!        write(20,*) 'rrcut  ',rrcut
!
!        rcut=rrcut*sigma
!
!        call flush(20)
!        close(10)


!       parameters for the tersoff potential
        open(666,file='pot',status='old')

        read(666,*) beta(1),beta(2)
        write(20,*) 'beta        ',beta(1),beta(2)

        read(666,*) nexp(1),nexp(2)
        write(20,*) 'nexp        ',nexp(1),nexp(2)

        read(666,*) c(1),c(2)
        write(20,*) 'c           ',c(1),c(2)

        read(666,*) d(1),d(2)
        write(20,*) 'd           ',d(1),d(2)

        read(666,*) h(1),h(2)
        write(20,*) 'h           ',h(1),h(2)

        read(666,*) ri(1),ri(2)
        write(20,*) 'rcs         ',ri(1),ri(2)

        read(666,*) si(1),si(2)
        write(20,*) 'si          ',si(1),si(2)

        read(666,*) ai(1),ai(2)
        write(20,*) 'ai          ',ai(1),ai(2)

        read(666,*) bi(1),bi(2)
        write(20,*) 'bi          ',bi(1),bi(2)

        read(666,*) li(1),li(2)
        write(20,*) 'li          ',li(1),li(2)

        read(666,*) mi(1),mi(2)
        write(20,*) 'mi          ',mi(1),mi(2)

        call flush(20)
        close(666)

!       set cutoff length for box and assign cross-species parameters
        rcut=0.0
        do i=1,2
        do j=1,2
          acap(i,j)=sqrt(ai(i)*ai(j))
          bcap(i,j)=sqrt(bi(i)*bi(j))
          rcap(i,j)=sqrt(ri(i)*ri(j))
          scap(i,j)=sqrt(si(i)*si(j))
          if (scap(i,j).gt.rcut) then
           rcut=scap(i,j)
          end if
          lambij(i,j)=0.5*(li(i)+li(j))
          muij(i,j)=0.5*(mi(i)+mi(j))
 
          omega(i,j)=1.0

        enddo
        enddo


        chi(1,1)=1.0
        chi(2,2)=1.0

        chi(1,2)=1.00769
        chi(2,1)=1.00769

        write(20,*) 'chi ',chi(1,1),chi(2,2)
        write(20,*) 'chi ',chi(1,2),chi(2,1)
     


!      set initial position; absolute and relative
!      keep track of absolute position using xshf, yshf and zshf

!      set initial velocity to zero

!      ncellx,ncelly,ncellz are the number of unit cells in the supercell
!      lattx,latty,latty are the side-lengths of the unit cells





       if(struc.eq.0)then      ! read in positions

       open(41,file='inpos',status='old')
       read(41,*)natom
       do i=1,natom
        read(41,411)satom(i),xshf(i),yshf(i),zshf(i),
&	            xvel(i),yvel(i),zvel(i),
&	  	    xacc(i),yacc(i),zacc(i),
&		    xpos(i),ypos(i),zpos(i) 
411	format(6x,i5,1x,3(f5.1,1x),9(f16.8,1x))
	
!     adjusting new positions for periodicity
      if (xpos(i).lt.0)then
             xpos(i)=xpos(i)+totlx
             xshf(i)=xshf(i)-1
      else if( xpos(i).gt.totlx)then
             xpos(i)=xpos(i)-totlx
             xshf(i)=xshf(i)+1
      endif
      if (ypos(i).lt.0)then
             ypos(i)=ypos(i)+totly
             yshf(i)=yshf(i)-1
      else if( ypos(i).gt.totly)then
             ypos(i)=ypos(i)-totly
             yshf(i)=yshf(i)+1
      endif
      if (zpos(i).lt.0) then
             zpos(i)=zpos(i)+totlz
             zshf(i)=zshf(i)-1
      else if( zpos(i).gt.totlz)then
             zpos(i)=zpos(i)-totlz
             zshf(i)=zshf(i)+1
      endif

	if(satom(i).eq.1)then
	  mass(i)=mass1
	  name1(i)='SI'
	  name2(i)='Si'
	else if(satom(i).eq.2)then
	  mass(i)=mass2
	  name1(i)='GE'
	  name2(i)='Ge'
	end if
            enddo 
          close(41)

       else if (struc.eq.1) then      ! diamond

            natom=0
            do i=1,ncellx
            do j=1,ncelly
            do k=1,ncellz

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.5)*lattx
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              
              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=((k-1)+0.5)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1
              xpos(natom)=((i-1)+0.5)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)+0.5)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
             
              natom=natom+1
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
          
            enddo 
            enddo 
            enddo 


        write(20,*) 'total number of atoms ',natom
        write(20,*) 'number of unit cells  ',ncellx,ncelly,ncellz

       else if (struc.eq.2) then     !   wurtzite

            natom=0
            do i=1,ncellx
            do j=1,ncelly
            do k=1,ncellz

              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=((k-1)+0.5)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)*lattx)+(bond/3.0)
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)*lattz)+(bond*2.0*sqrt(2.0)/3.0)
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1
              xpos(natom)=((i-1)*lattx)+(bond/3.0)
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=((k-1)*lattz)
     &                   +(bond*2.0*sqrt(2.0)/3.0)
     &                   +(bond*sqrt(2.0))
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1
              xpos(natom)=((i-1)*lattx)+(bond*4.0/3.0)
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)*lattz)+(bond*2.0*sqrt(2.0)/3.0)
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)*lattx)+(bond*4.0/3.0)
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=((k-1)*lattz)
     &                   +(bond*2.0*sqrt(2.0)/3.0)
     &                   +(bond*sqrt(2.0))
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)*lattx)+(bond*5.0/3.0)
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)*lattx)+(bond*5.0/3.0)
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=((k-1)+0.5)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

            enddo 
            enddo 
            enddo 


        write(20,*) 'total number of atoms ',natom
        write(20,*) 'number of unit cells  ',ncellx,ncelly,ncellz


       else if (struc.eq.3) then     !   fcc

            natom=0
            do i=1,ncellx
            do j=1,ncelly
            do k=1,ncellz

              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.5)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)+0.5)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.5)*lattx
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=((k-1)+0.5)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

            enddo 
            enddo 
            enddo 


        write(20,*) 'total number of atoms ',natom
        write(20,*) 'number of unit cells  ',ncellx,ncelly,ncellz


       else if (struc.eq.4) then     !   bcc

            natom=0
            do i=1,ncellx
            do j=1,ncelly
            do k=1,ncellz

              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.5)*lattx
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=((k-1)+0.5)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

            enddo 
            enddo 
            enddo 


        write(20,*) 'total number of atoms ',natom
        write(20,*) 'number of unit cells  ',ncellx,ncelly,ncellz


       else if (struc.eq.5) then     !   slab 100 surfaces


            natom=0
            do i=ncellxi,ncellxf
            do j=ncellyi,ncellyf
            do k=ncellzi,ncellzf

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.5)*lattx
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              
              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=((k-1)+0.5)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1
              xpos(natom)=((i-1)+0.5)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)+0.5)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
             
              natom=natom+1
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

            if (k.eq.ncellzf) then

              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.5)*lattx
              ypos(natom)=((j-1)+0.5)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
            end if

          
            enddo 
            enddo 
            enddo 


        write(20,*) 'total number of atoms ',natom
        write(20,*) '# of unit cells         ',ncellx,ncelly,ncellz
        write(20,*) '# of unit cells in slab ',
     &             ncellxf-ncellxi+1,ncellyf-ncellyi+1,ncellzf-ncellzi+1


       else if (struc.eq.6) then     !  sc


            natom=0
            do i=1,ncellx
            do j=1,ncelly
            do k=1,ncellz

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

            enddo 
            enddo 
            enddo 


        write(20,*) 'total number of atoms ',natom
        write(20,*) '# of unit cells         ',ncellx,ncelly,ncellz


       else if (struc.eq.7) then     !  cluster in sc geometry

            natom=0
            do i=ncellxi,ncellxf
            do j=ncellyi,ncellyf
            do k=ncellzi,ncellzf

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              if (i.eq.ncellxf.
     &        and.j.ne.ncellyf.
     &        and.k.ne.ncellzf) then     ! x

              natom=natom+1  
              xpos(natom)=i*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              end if

              if (i.ne.ncellxf.
     &        and.j.eq.ncellyf.
     &        and.k.ne.ncellzf) then     ! y

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=j*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              end if

              if (i.ne.ncellxf.
     &        and.j.ne.ncellyf.
     &        and.k.eq.ncellzf) then     ! z

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              end if

              if (i.eq.ncellxf.
     &        and.j.eq.ncellyf.
     &        and.k.ne.ncellzf) then     ! xy

              natom=natom+1  
              xpos(natom)=i*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=j*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=i*lattx
              ypos(natom)=j*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              end if

              if (i.eq.ncellxf.
     &        and.j.ne.ncellyf.
     &        and.k.eq.ncellzf) then     ! xz

              natom=natom+1  
              xpos(natom)=i*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=i*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              end if

              if (i.ne.ncellxf.
     &        and.j.eq.ncellyf.
     &        and.k.eq.ncellzf) then     ! yz

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=j*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=j*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              end if

              if (i.eq.ncellxf.
     &        and.j.eq.ncellyf.
     &        and.k.eq.ncellzf) then     ! xyz

              natom=natom+1  
              xpos(natom)=i*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=j*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=i*lattx
              ypos(natom)=j*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=i*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=(i-1)*lattx
              ypos(natom)=j*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1  
              xpos(natom)=i*lattx
              ypos(natom)=j*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              end if

            enddo 
            enddo 
            enddo 


        write(20,*) 'total number of atoms ',natom
        write(20,*) '# of unit cells         ',ncellx,ncelly,ncellz


       else if (struc.eq.8) then     !   slab 100 surfaces oriented along dimer row

            natom=0
            do i=ncellxi,ncellxf
            do j=ncellyi,ncellyf
            do k=ncellzi,ncellzf

              natom=natom+1                        ! 1
              xpos(natom)=(i-1)*lattx
                if (k.eq.ncellzi) then
                  xpos(natom)=xpos(natom)+disp 
                end if
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 2
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 3
              xpos(natom)=(i-1)*lattx
                if (k.eq.ncellzi) then
                  xpos(natom)=xpos(natom)+disp 
                end if
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 4
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 5
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.50)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1                        ! 6
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.50)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              
              natom=natom+1                        ! 7
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1                        ! 8
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 1b
              xpos(natom)=((i-1)+0.50)*lattx
                if (k.eq.ncellzi) then
                  xpos(natom)=xpos(natom)-disp 
                end if
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 2b
              xpos(natom)=((i-1)+0.50)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 3b
              xpos(natom)=((i-1)+0.50)*lattx
                if (k.eq.ncellzi) then
                  xpos(natom)=xpos(natom)-disp 
                end if
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 4b
              xpos(natom)=((i-1)+0.50)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 5b
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.50)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1                        ! 6b
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.50)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              
              natom=natom+1                        ! 7b
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1                        ! 8b
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
            if (k.eq.ncellzf) then

              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)*latty)+disp
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.50)*lattx
              ypos(natom)=((j-1)*latty)+disp
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(((j-1)+0.50)*latty)-disp
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.50)*lattx
              ypos(natom)=(((j-1)+0.50)*latty)-disp
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

            end if

          
            enddo 
            enddo 
            enddo 


        write(20,*) 'total number of atoms ',natom
        write(20,*) '# of unit cells         ',ncellx,ncelly,ncellz
        write(20,*) '# of unit cells in slab ',
     &             ncellxf-ncellxi,ncellyf-ncellyi,ncellzf-ncellzi


       else if (struc.eq.81) then     !   slab 100 surfaces oriented along dimer row
                                      !   you want to tilt dimers here

            natom=0
            do i=ncellxi,ncellxf
            do j=ncellyi,ncellyf
            do k=ncellzi,ncellzf

              natom=natom+1                        ! 1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
                if (k.eq.ncellzi) then
                  xpos(natom)=xpos(natom)+disp 
                  zpos(natom)=zpos(natom)+dispz
                end if
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 2
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 3
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=(k-1)*lattz
                if (k.eq.ncellzi) then
                  xpos(natom)=xpos(natom)+disp 
                  zpos(natom)=zpos(natom)-dispz
                end if
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 4
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 5
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.50)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1                        ! 6
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.50)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              
              natom=natom+1                        ! 7
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1                        ! 8
              xpos(natom)=((i-1)+0.25)*lattx
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 1b
              xpos(natom)=((i-1)+0.50)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
                if (k.eq.ncellzi) then
                  xpos(natom)=xpos(natom)-disp 
                  zpos(natom)=zpos(natom)-dispz
                end if
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 2b
              xpos(natom)=((i-1)+0.50)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 3b
              xpos(natom)=((i-1)+0.50)*lattx
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=(k-1)*lattz
                if (k.eq.ncellzi) then
                  xpos(natom)=xpos(natom)-disp 
                  zpos(natom)=zpos(natom)+dispz
                end if
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 4b
              xpos(natom)=((i-1)+0.50)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.25)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 5b
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)+0.50)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1                        ! 6b
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)+0.50)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              
              natom=natom+1                        ! 7b
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
              natom=natom+1                        ! 8b
              xpos(natom)=((i-1)+0.75)*lattx
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=((k-1)+0.75)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0
              
            if (k.eq.ncellzf) then

              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)*latty)+disp
              zpos(natom)=k*lattz
                zpos(natom)=zpos(natom)+dispz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.50)*lattx
              ypos(natom)=((j-1)*latty)+disp
              zpos(natom)=k*lattz
                zpos(natom)=zpos(natom)-dispz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(((j-1)+0.50)*latty)-disp
              zpos(natom)=k*lattz
                zpos(natom)=zpos(natom)-dispz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1
              xpos(natom)=((i-1)+0.50)*lattx
              ypos(natom)=(((j-1)+0.50)*latty)-disp
              zpos(natom)=k*lattz
                zpos(natom)=zpos(natom)+dispz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

            end if

          
            enddo 
            enddo 
            enddo 


        write(20,*) 'total number of atoms ',natom
        write(20,*) '# of unit cells         ',ncellx,ncelly,ncellz
        write(20,*) '# of unit cells in slab ',
     &             ncellxf-ncellxi,ncellyf-ncellyi,ncellzf-ncellzi



       else if (struc.eq.9) then     !   slab 111 

            natom=0
            do i=ncellxi,ncellxf
            do j=ncellyi,ncellyf
            do k=ncellzi,ncellzf

              natom=natom+1                        ! 1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 2
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              if (k.eq.ncellzf) then

              natom=natom+1                        ! 1
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 2
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              end if

              natom=natom+1                        ! 3
              xpos(natom)=(i-1)*lattx
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)*lattz)+2.353
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 4
              xpos(natom)=(i-1)*lattx
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=((k-1)*lattz)+2.352
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 5
              xpos(natom)=((i-1)*lattx)+1.10850000
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)*lattz)+3.13533333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 6
              xpos(natom)=((i-1)*lattx)+1.10850000
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)*lattz)+3.13533333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 7
              xpos(natom)=((i-1)*lattx)+1.10850000
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)*lattz)+5.48733333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 8
              xpos(natom)=((i-1)*lattx)+1.10850000
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)*lattz)+5.48733333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 9
              xpos(natom)=((i-1)*lattx)+2.21700000
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)*lattz)+6.27066667
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 10
              xpos(natom)=((i-1)*lattx)+2.21700000
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=((k-1)*lattz)+6.27066667
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 11
              xpos(natom)=((i-1)*lattx)+2.21700000
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)*lattz)+8.62266667
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 12
              xpos(natom)=((i-1)*lattx)+2.21700000
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=((k-1)*lattz)+8.62266667
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              if (k.eq.ncellzi) then
               
              natom=natom+1                        ! 11
              xpos(natom)=((i-1)*lattx)+2.21700000
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)*lattz)-0.78333333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 12
              xpos(natom)=((i-1)*lattx)+2.21700000
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=((k-1)*lattz)-0.78333333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              end if


              natom=natom+1                        ! 1b
              xpos(natom)=((i-1)*lattx)+3.3255
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 2b
              xpos(natom)=((i-1)*lattx)+3.3255
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=(k-1)*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              if (k.eq.ncellzf) then

              natom=natom+1                        ! 1b
              xpos(natom)=((i-1)*lattx)+3.3255
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 2b
              xpos(natom)=((i-1)*lattx)+3.3255
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=k*lattz
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              end if

              natom=natom+1                        ! 3b
              xpos(natom)=((i-1)*lattx)+3.3255
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)*lattz)+2.353
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 4b
              xpos(natom)=((i-1)*lattx)+3.3255
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)*lattz)+2.352
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 5b
              xpos(natom)=((i-1)*lattx)+4.434
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)*lattz)+3.13533333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 6b
              xpos(natom)=((i-1)*lattx)+4.434
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=((k-1)*lattz)+3.13533333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 7b
              xpos(natom)=((i-1)*lattx)+4.434
              ypos(natom)=(j-1)*latty
              zpos(natom)=((k-1)*lattz)+5.48733333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 8b
              xpos(natom)=((i-1)*lattx)+4.434
              ypos(natom)=((j-1)+0.50)*latty
              zpos(natom)=((k-1)*lattz)+5.48733333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 9b
              xpos(natom)=((i-1)*lattx)+5.5425
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)*lattz)+6.27066667
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 10b
              xpos(natom)=((i-1)*lattx)+5.5425
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)*lattz)+6.27066667
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 11b
              xpos(natom)=((i-1)*lattx)+5.5425
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)*lattz)+8.62266667
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 12b
              xpos(natom)=((i-1)*lattx)+5.5425
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)*lattz)+8.62266667
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              if (k.eq.ncellzi) then

              natom=natom+1                        ! 11b
              xpos(natom)=((i-1)*lattx)+5.5425
              ypos(natom)=((j-1)+0.25)*latty
              zpos(natom)=((k-1)*lattz)-0.78333333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              natom=natom+1                        ! 12
              xpos(natom)=((i-1)*lattx)+5.5425
              ypos(natom)=((j-1)+0.75)*latty
              zpos(natom)=((k-1)*lattz)-0.78333333
              xshf(natom)=0
              yshf(natom)=0
              zshf(natom)=0
              xvel(natom)=0
              yvel(natom)=0
              zvel(natom)=0
              xacc(natom)=0
              yacc(natom)=0
              zacc(natom)=0

              end if

          
            enddo 
            enddo 
            enddo 


	write(996,*)natom






        if (nsurf.gt.0) then
          
         do i=1,nsurf
           natom=natom+1
           xpos(natom)=xtemp(i)
           ypos(natom)=ytemp(i)
           zpos(natom)=ztemp(i)          
           xshf(natom)=0
           yshf(natom)=0
           zshf(natom)=0
           xvel(natom)=0
           yvel(natom)=0
           zvel(natom)=0
           xacc(natom)=0
           yacc(natom)=0
           zacc(natom)=0
         enddo        

        end if                 !   add atoms to surface



        write(20,*) 'total number of atoms ',natom
        write(20,*) '# of unit cells         ',ncellx,ncelly,ncellz
        write(20,*) '# of unit cells in slab ',
     &             ncellxf-ncellxi,ncellyf-ncellyi,ncellzf-ncellzi


       end if

       call flush(20)

!     setting mass of atoms and atom type

!     initializing all atoms to silicon first
       if(struc.ne.0)then
       if(theta1.ne.0)then
       do i=1,natom-nsurf
        satom(i)=1
        name1(i)='SI'
        name2(i)='Si'
        mass(i)=mass1
       enddo

       nsi=(natom-nsurf)*theta1
       k=(natom-nsurf)-nsi
       nge=0
       do i=1,k
665     rdum=ran3(seed)*(natom-nsurf)
        idum=int(rdum)
        if (idum.lt.1.or.idum.gt.(natom-nsurf)) go to 665
        if (satom(idum).eq.2) go to 665
        satom(idum)=2
        name1(idum)='GE'
        name2(idum)='Ge'
        mass(idum)=mass2
        nge=nge+1
       enddo
       else if(theta1.eq.0)then
         do i=1,natom-nsurf
	   satom(i)=2
	   name1(i)='GE'
	   name2(i)='Ge'
	   mass(i)=mass2
	 end do
       nge=natom
       nsi=0
       end if  !theta 1 condition
       end if  !struc ne 0
	


!      specially set the species of some atoms
       if (nset.ge.1) then
         do i=1,nset
          iatom=iset(i)
          if (sset(i).eq.1) then
           if (satom(iatom).eq.2) then
            name1(iatom)='SI'
            name2(iatom)='Si'
            mass(iatom)=mass1
            satom(iatom)=1
            nsi=nsi+1
            nge=nge-1
           end if
          else if (sset(i).eq.2) then
           if (satom(iatom).eq.1) then
            name1(iatom)='GE'
            name2(iatom)='Ge'
            mass(iatom)=mass2
            satom(iatom)=2
            nsi=nsi-1
            nge=nge+1
           end if
          end if
         enddo
       end if

       do i=1,nsurf
        satom(natom-nsurf+i)=itemp(i)
        if (itemp(i).eq.1) then
          nsi=nsi+1
          name1(natom-nsurf+i)='SI'
          name2(natom-nsurf+i)='Si'
          mass(natom-nsurf+i)=mass1 
        else
          nge=nge+1
          name1(natom-nsurf+i)='GE'
          name2(natom-nsurf+i)='Ge'
          mass(natom-nsurf+i)=mass2 
        end if
       enddo
        
       write(20,*) 'number of silicon atoms   ',nsi
       write(20,*) 'number of germanium atoms ',nge


!     setting initial velocities

      if (mod(natom,2).eq.0) then

        do i=1,natom-1,2
           call rangauss(rdum1,rdum2)
           call rangauss(rdum3,rdum4)
           call rangauss(rdum5,rdum6)
           xvel(i)=rdum1*sqrt(vscale/mass(i))
           yvel(i)=rdum2*sqrt(vscale/mass(i))
           zvel(i)=rdum3*sqrt(vscale/mass(i))
           xvel(i+1)=rdum4*sqrt(vscale/mass(i+1))
           yvel(i+1)=rdum5*sqrt(vscale/mass(i+1))
           zvel(i+1)=rdum6*sqrt(vscale/mass(i+1))
        enddo

      else

        do i=1,natom-2,2
           call rangauss(rdum1,rdum2)
           call rangauss(rdum3,rdum4)
           call rangauss(rdum5,rdum6)
           xvel(i)=rdum1*sqrt(vscale/mass(i))
           yvel(i)=rdum2*sqrt(vscale/mass(i))
           zvel(i)=rdum3*sqrt(vscale/mass(i))
           xvel(i+1)=rdum4*sqrt(vscale/mass(i+1))
           yvel(i+1)=rdum5*sqrt(vscale/mass(i+1))
           zvel(i+1)=rdum6*sqrt(vscale/mass(i+1))
        enddo

           call rangauss(rdum1,rdum2)
           call rangauss(rdum3,rdum4)
           xvel(natom)=rdum1*sqrt(vscale/mass(natom))
           yvel(natom)=rdum2*sqrt(vscale/mass(natom))
           zvel(natom)=rdum3*sqrt(vscale/mass(natom))

      end if


       vscale=vscale*3.0/4.0      ! converting vscale to 3/2 kT for use in rescaling velocities

       open(22,file='inbath.car',status='new')
       open(23,file='outbath.car',status='new')

       open(11,file='in.car',status='new')
       open(12,file='out.car',status='new')

       write(11,21)'!BIOSYM archive 3'
21     format(a17)
       write(11,22)'PBC=ON'
22     format(a6)
       write(11,*)' '
       write(11,24)'!DATE Wed Jun 30 10:08:45 1999'
24     format(a30)
       write(11,25) 'PBC',ncellx*lattx,ncelly*latty,
     &                    ncellz*lattz,90.0,90.0,90.0,'(P1)'
25     format(a3,1x,6(f10.4,1x),a4)

!      writing out a .car file
       do i=1,natom
          write(11,12) name1(i),xpos(i),ypos(i),zpos(i),
     &    '0000 1      ?       ',name2(i),0.0
       enddo

12     format(a2,4x,3(f14.9,1x),a20,a2,f7.3)
       write(11,13) 'end'
       write(11,13) 'end'
13     format(a3)

       close(11)

       call flush(11)


!        if (struc.eq.5) then
!          stop
!        end if


       rmax=rcut
 
       write(20,*) 'maximum rcut ',rmax

       rdum=(ncellx*lattx)/rmax
       xnbox=int(rdum)
       rdum=(ncelly*latty)/rmax
       ynbox=int(rdum)
       rdum=(ncellz*lattz)/rmax
       znbox=int(rdum)


!      the supercell is partitioned into xnbox,ynbox,znbox
!      the side lengths of these boxes are cellx,celly,cellz

       cellx=(ncellx*lattx)/xnbox
       celly=(ncelly*latty)/ynbox
       cellz=(ncellz*lattz)/znbox


       write(20,*) 'unit cells'
       write(20,*) 'number of unit cells in supercell'
       write(20,*) 'ncell ',ncellx,ncelly,ncellz
       write(20,*) 'side-lengths of unit cells'
       write(20,*) 'latt  ',lattx,latty,lattz
       write(20,*) '  '
       write(20,*) 'check supercell length'
       write(20,*) lattx*ncellx
       write(20,*) latty*ncelly
       write(20,*) lattz*ncellz
       write(20,*) '  '

       write(20,*) 'boxes'
       write(20,*) 'number of boxes in supercell'
       write(20,*) 'box # ',xnbox,ynbox,znbox
       write(20,*) 'side-lengths of boxes'
       write(20,*) 'cell  ',cellx,celly,cellz
       write(20,*) '  '
       write(20,*) 'check supercell length'
       write(20,*) cellx*xnbox
       write(20,*) celly*ynbox
       write(20,*) cellz*znbox
       write(20,*) '  '

       write(20,*) 'ratio of box length to rcut'
       write(20,*) 'this must be larger than one'
       write(20,*) 'x-direction',cellx/rcut
       write(20,*) 'y-direction',celly/rcut
       write(20,*) 'z-direction',cellz/rcut

       write(20,*) 'volume of cell'
       write(20,*)  ncellx*ncelly*ncellz*lattx*latty*lattz
       write(20,*) 'volume per atom '
       write(20,*)  ncellx*ncelly*ncellz*lattx*latty*lattz/natom 

!       if (struc.eq.2) then
!        stop
!       end if



       if (cellx/rcut.le.1.0) then
        write(20,*) 'x-box too small'
        stop
       end if

       if (celly/rcut.le.1.0) then
        write(20,*) 'y-box too small'
        stop
       end if

       if (cellz/rcut.le.1.0) then
        write(20,*) 'z-box too small'
        stop
       end if


!      set up array for atom distribution along z-direction
       stepz=(ncellz*lattz)/nstep


       call flush(20)



!           initializing lists of atoms in box 
            nbox=0
            do i=1,xnbox
            do j=1,ynbox
            do k=1,znbox
               nbox=nbox+1
               xbox(nbox)=i
               ybox(nbox)=j
               zbox(nbox)=k

               natbox(nbox)=0
               indbox(i,j,k)=nbox
               write(20,*) 'box index'
               write(20,*) i,j,k,indbox(i,j,k)
               do ndum=1,maxat
                 iatbox(ndum,nbox)=0
               enddo  

               nbxp(nbox)=0
               do ndum=1,26
                wbxp(ndum,nbox)=0
               enddo

            enddo
            enddo
            enddo



!           construct box-pairs
            npair=0
            do ibox1=1,nbox-1
            do ibox2=ibox1+1,nbox
               deli=xbox(ibox2)-xbox(ibox1)
               delj=ybox(ibox2)-ybox(ibox1)
               delk=zbox(ibox2)-zbox(ibox1)

!  periodic slab

               if (deli.gt.xnbox/2) then
                  deli=deli-xnbox
               else if (deli.lt.-xnbox/2) then
                  deli=deli+xnbox
               end if
               deli=abs(deli)
     
               if (delj.gt.ynbox/2) then
                  delj=delj-ynbox
               else if (delj.lt.-ynbox/2) then
                  delj=delj+ynbox
               end if
               delj=abs(delj)
 
               if (delk.gt.znbox/2) then
                  delk=delk-znbox
               else if (delk.lt.-znbox/2) then
                  delk=delk+znbox
               end if
               delk=abs(delk)


               if (deli.le.1.and.delj.le.1.and.delk.le.1) then
                  npair=npair+1
                  ibxp(1,npair)=ibox1
                  ibxp(2,npair)=ibox2  

                  nbxp(ibox1)=nbxp(ibox1)+1
                  nbxp(ibox2)=nbxp(ibox2)+1
                  wbxp(nbxp(ibox1),ibox1)=ibox2
                  wbxp(nbxp(ibox2),ibox2)=ibox1

!                  write(20,*) '  '
!                  write(20,*) 'box-pair ',npair
!                  write(20,*) ibox1,ibox2
!                  write(20,20) xbox(ibox1),ybox(ibox1),zbox(ibox1)
!                  write(20,20) xbox(ibox2),ybox(ibox2),zbox(ibox2)
!                  write(20,*) '  '
               end if
            enddo
            enddo

            write(20,*) 'number of box pairs',npair


!            write(20,*) 'partners for each box '
!            do ibox1=1,nbox
!              write(20,*) 'Box ',ibox1,' has ',nbxp(ibox1)
!              do ndum=1,nbxp(ibox1)
!               write(20,*) ndum,wbxp(ndum,ibox1)
!              enddo
!            enddo




20          format(1x,3(i5,1x))


!           place atoms in box

            do iatom=1,natom
               xdum=xpos(iatom)/cellx
               idum=int(xdum)+1
               ydum=ypos(iatom)/celly
               jdum=int(ydum)+1
               zdum=zpos(iatom)/cellz
               kdum=int(zdum)+1

               ibox=indbox(idum,jdum,kdum)
               natbox(ibox)=natbox(ibox)+1
               iatbox(natbox(ibox),ibox)=iatom

               wbatom(iatom)=ibox            ! gives the box iatom is in
               ibatom(iatom)=natbox(ibox)    ! iatom is atom # ibatom in box ibox

               call flush(20)


            enddo            


            nmax=0
            nmin=natom
            do i=1,nbox
              if (nmax.lt.natbox(i)) then
                nmax=natbox(i)
              end if 
              if (nmin.gt.natbox(i)) then
                nmin=natbox(i)
              end if 
            enddo

            write(20,*) 'maximum number of atoms in box ',nmax
            write(20,*) 'minimum number of atoms in box ',nmin


            call flush(20)


!           estimating atom pairs 
!            ndum=(npair*(nmax*nmax))+(nbox*nmax*(nmax-1)/2)
!            write(20,*) 'estimated number of atom pairs ',ndum
!            if (ndum.gt.tpair) then
!              write(20,*) 'tpair is too small ',tpair
!              stop
!            end if


!           estimating atom triplets
!            ndum=ndum/natom          ! number of pairs per atom
!            ndum=ndum*(ndum-1)/2     ! number of trips per atom
!            ndum=ndum*natom          ! number of trips
!            write(20,*) 'estimated number of atom trips ',ndum
!            if (ndum.gt.ttrip) then
!              write(20,*) 'ttrip is too small ',ttrip
!              stop
!            end if



!           estimating atom pairs for one atom
            ndum=(26*nmax)+(nmax*(nmax-1)/2)
            write(20,*) 'estimated number of atom pairs ',ndum
            if (ndum.gt.tpair) then
              write(20,*) 'tpair is too small ',tpair
              stop
            end if


!           estimating atom triplets
            ndum=ndum*(ndum-1)/2     ! number of trips per atom
            write(20,*) 'estimated number of atom trips ',ndum
            if (ndum.gt.ttrip) then
              write(20,*) 'ttrip is too small ',ttrip,'try ',ndum
              stop
            end if



!           set up heat bath atoms

!      set up array for atom distribution along z-direction
       stepz=(ncellz*lattz)/nstep

            zbathlo=((ncellz*lattz)/2.0)-wbath
            zbathhi=((ncellz*lattz)/2.0)+wbath

            nbath=0
            do i=1,natom
              batom(i)=0
              zdum=zpos(i)
              if (zdum.gt.zbathlo.and.zdum.lt.zbathhi) then
               nbath=nbath+1
               ibath(nbath)=i
               batom(i)=1
              end if
            enddo

           write(20,*) 'heat bath between ',zbathlo,zbathhi
           write(20,*) 'number of heat bath atoms ',nbath

       write(22,21)'!BIOSYM archive 3'
       write(22,22)'PBC=ON'
       write(22,*)' '
       write(22,24)'!DATE Wed Jun 30 10:08:45 1999'
       write(22,25) 'PBC',ncellx*lattx,ncelly*latty,
     &                    ncellz*lattz,90.0,90.0,90.0,'(P1)'

!      writing out a .car file for the bath atoms
       do idum=1,nbath
          i=ibath(idum)
          write(22,12) name1(i),xpos(i),ypos(i),zpos(i),
     &    '0000 1      ?       ',name2(i),0.0
       enddo

       write(22,13) 'end'
       write(22,13) 'end'

       call flush(22)

             
           zdum=zpos(iatom)/stepz
           kdum=int(zdum)+1
           ncount(kdum)=ncount(kdum)+1





            


!   print out atom lists

!          write(20,*) 'atom list'
!          do i=1,nbox
!             write(20,*) 'box number ',i
!             write(20,*) (xbox(i)-1)*cellx,' to ',xbox(i)*cellx
!             write(20,*) (ybox(i)-1)*cellx,' to ',ybox(i)*celly
!             write(20,*) (zbox(i)-1)*cellx,' to ',zbox(i)*cellz
!             write(20,*) 'number of atoms in box ',natbox(i)
!             do j=1,natbox(i)
!               iatom=iatbox(j,i)
!               write(20,*) 'atom-number ',iatom
!               write(20,*) 'position '
!               write(20,122) xpos(iatom),ypos(iatom),zpos(iatom)
!               if (xpos(iatom).lt.(xbox(i)-1)*cellx.or.
!     &             xpos(iatom).gt.xbox(i)*cellx) then
!                 write(20,*) 'x problem'
!                 stop
!               end if
!               if (ypos(iatom).lt.(ybox(i)-1)*celly.or.
!     &             ypos(iatom).gt.ybox(i)*celly) then
!                 write(20,*) 'y problem'
!                 stop
!               end if
!               if (zpos(iatom).lt.(zbox(i)-1)*cellz.or.
!     &             zpos(iatom).gt.zbox(i)*cellz) then
!                 write(20,*) 'z problem'
!                 stop
!               end if
!             enddo
!          enddo
!
!122       format(1x,3(f16.8,1x))


            time=0.0


!      if using velverlet acceleration at t=0 is needed
             if (time.eq.0.0) then
              do i=1,natom
               dxpos(i)=xpos(i) 
               dypos(i)=ypos(i)
               dzpos(i)=zpos(i)
               dxfor(i)=0.0
               dyfor(i)=0.0
               dzfor(i)=0.0
              enddo

!              call pot_mfvf
!              call pot_bg
!              call pot_sw

              call pot_ter

              do i=1,natom
               xfor(i)=dxfor(i) 
               yfor(i)=dyfor(i) 
               zfor(i)=dzfor(i) 
               xacc(i)=dxfor(i)/mass(i)
               yacc(i)=dyfor(i)/mass(i)
               zacc(i)=dzfor(i)/mass(i)
              enddo
             end if


!      writing positions,forces,velocities and accelerations
       write(40,*) 'iteration ',0
       write(50,*) 'iteration ',0
       do i=1,natom
        write(40,41) i,xpos(i),ypos(i),zpos(i),xfor(i),yfor(i),zfor(i)
        write(50,51) i,xvel(i),yvel(i),zvel(i),xacc(i),yacc(i),zacc(i)
       enddo

          avekin=0.0
          avekinbath=0.0
          do i=1,natom
            rdum=(0.5*mass(i)*xvel(i)*xvel(i))
            rdum=rdum+(0.5*mass(i)*yvel(i)*yvel(i))
            rdum=rdum+(0.5*mass(i)*zvel(i)*zvel(i))
            if (batom(i).eq.0) then
             avekin=avekin+rdum
            else
             avekinbath=avekinbath+rdum
            end if
          enddo
          if (natom-nbath.gt.0) then 
           avekin=avekin/float(natom-nbath)
          end if
          if (nbath.gt.0) then
           avekinbath=avekinbath/float(nbath)
          end if


!     writing out initial energy
       write(30,31) iiter1,iiter2,time,e2/natom,e3/natom,
     &        (e2+e3)/natom,
     &         avekin,avekinbath,nsi,nge,nsi+nge

       if ((e2+e3)/natom.lt.elo) then
        elo=(e2+e3)/natom
       end if

!	run_sum_a=0
!	run_sum_b=0
!	run_sum_c=0
!	run_sum_d=0
!	run_sum_e=0
	

	e5=0.0

            do iiter1=1,niter1


            do iiter2=1,niter2

            write(20,*) 'moving atoms ',iiter1,iiter2
            call flush(20)


!     adjust time step or epsilon if needed
            dtime=dtime0
!            epsilon=epsilon0


!           choice of 'dynamics' here

!     moving atoms

!     molecular dynamics
          call velverlet
!     using Monte-Carlo
!          call montecarlo

      write(20,*) 'number of atoms ',natom

!     computing kinetic energies for bath and non-bath atoms
!     
          avekin=0.0
          avekinbath=0.0
          do i=1,natom
            rdum=0.5*xvel(i)*xvel(i)*mass(i)
            rdum=rdum+(0.5*yvel(i)*yvel(i)*mass(i))
            rdum=rdum+(0.5*zvel(i)*zvel(i)*mass(i))
            if (batom(i).eq.0) then
             avekin=avekin+rdum
            else
             avekinbath=avekinbath+rdum
            end if
          enddo
          if (natom-nbath.gt.0) then
           avekin=avekin/float(natom-nbath)
          end if
          if (nbath.gt.0) then
           avekinbath=avekinbath/float(nbath)
          end if


!           writing out energy
!            write(30,31) iiter1,iiter2,time,e2/natom,e3/natom,
!     &                   (e2+e3)/natom,
!     &                   avekin,avekinbath,nsi,nge,nsi+nge


            if ((e2+e3)/natom.lt.elo) then
             elo=(e2+e3)/natom
            end if

31          format(1x,2(i5,1x),6(f23.15,1x),3(i7,1x))
            call flush(30)


!     rescaling the velocity of bath atoms
!     rescale velocity by sqrt[ (3/2)kT / Avekin ]
          do i=1,nbath
            iatom=ibath(i)
            xvel(iatom)=xvel(iatom)*sqrt(vscale/avekinbath)
            yvel(iatom)=yvel(iatom)*sqrt(vscale/avekinbath)
            zvel(iatom)=zvel(iatom)*sqrt(vscale/avekinbath)
          enddo


!           reinitialize list of atoms in box

            do ibox=1,nbox
               natbox(ibox)=0
               do ndum=1,maxat
                 iatbox(ndum,ibox)=0
               enddo
            enddo


!           replace atoms in box
!           if the subscripts of indbox goes out of range
!             chances are your time-steps are too large
            do iatom=1,natom

               xdum=xpos(iatom)/cellx
               idum=int(xdum)+1
               ydum=ypos(iatom)/celly
               jdum=int(ydum)+1
               zdum=zpos(iatom)/cellz
               kdum=int(zdum)+1

               ibox=indbox(idum,jdum,kdum)
               natbox(ibox)=natbox(ibox)+1
               iatbox(natbox(ibox),ibox)=iatom

               wbatom(iatom)=ibox            ! gives the box iatom is in
               ibatom(iatom)=natbox(ibox)    ! iatom is atom # ibatom in box ibox

            enddo


            enddo                            ! looping over iiter2

!       rewind 40

!	kT=0.0000861*temp
!    average energy
            e5=e5+((e2+e3)/natom)
	    if(mod(iiter1,10).eq.0) then
	      write(912,191) e5/10.0
	      call flush(912)
              e5=0.0
191	      format (1x,f18.15)
            end if 

	temperature=(2/(3*0.000086166560553))*avekinbath
	write(888,*) temperature
	call flush(888)



!      writing out energy
            write(30,31) iiter1,iiter2,time,e2/natom,e3/natom,
     &                   (e2+e3)/natom,
     &                   avekin,avekinbath,nsi,nge,nsi+nge


!      writing positions,forces,velocities and accelerations
!        for each outer loop

       write(40,*) 'finished niter2 iiter1 is equal to ',iiter1
       write(50,*) 'finished niter2 iiter1 is equal to ',iiter1
        
	if(iiter1.eq.niter1)then
	  write(913,*)natom
	end if
       do i=1,natom
       write(40,41) i,xpos(i),ypos(i),zpos(i),xfor(i),yfor(i),zfor(i)
       write(50,51) i,xvel(i),yvel(i),zvel(i),xacc(i),yacc(i),zacc(i)
       if (iiter1.eq.niter1)then
	  
       write(913,91)i,satom(i),xshf(i),yshf(i),zshf(i),xvel(i),yvel(i),
     &         zvel(i),xacc(i),yacc(i),zacc(i),xpos(i),ypos(i),zpos(i)
	end if

       enddo
41     format(1x,i4,1x,6(f16.8,1x))
51     format(1x,i4,1x,6(f16.8,1x))
91     format(i5,1x,i5,1x,3(f5.1,1x),9(f16.8,1x))

       call flush(913)




!           switch atom pairs

!	not possible for completely pure slabs. added statement for this now



	  if(nge.gt.0.and.nsi.gt.0)then
            nswitch=0
            do iiter3=1,niter3

	      if(nge.eq.0) go to 456
	      if(nge.gt.0) then
	     

111           rdum=ran3(seed)*natom
              catom1=int(rdum)+1
              if (catom1.lt.1.or.catom1.gt.natom) go to 111

112           rdum=ran3(seed)*natom
              catom2=int(rdum)+1

              if (catom2.lt.1.or.catom2.gt.natom.or.
     &            catom2.eq.catom1.or.
     &            satom(catom1).eq.satom(catom2)) go to 112

!              set energy and species before calling en_ter
               e2=0.0
               e3=0.0
               s1i=satom(catom1)
               s2i=satom(catom2)
               s1f=s2i
               s2f=s1i

!               write(20,*) catom1,catom2
!               write(20,*) 'species ',s1i,s2i,s1f,s2f

               call en_ter

!               write(20,*) 'energy change ',e2+e3
               if (e2+e3.lt.0) then          !  switch occurs
                satom(catom1)=s1f
                satom(catom2)=s2f
                nswitch=nswitch+1

                nd1=name1(catom1)
                nd2=name1(catom2)
                name1(catom1)=nd2
                name1(catom2)=nd1
                nd1=name2(catom1)
                nd2=name2(catom2)
                name2(catom1)=nd2
                name2(catom2)=nd1
		dmass1=mass(catom1)
		dmass2=mass(catom2)
		mass(catom1)=dmass2
		mass(catom2)=dmass1

               else
                 rdum=ran3(seed)
                 pdum=exp(-(e2+e3)/beta1)
!                 write(20,*) 'rdum pdum',rdum,pdum
                 if (rdum.lt.pdum) then      !  switch occurs
                   satom(catom1)=s1f
                   satom(catom2)=s2f
                   nswitch=nswitch+1

                   nd1=name1(catom1)
                   nd2=name1(catom2)
                   name1(catom1)=nd2
                   name1(catom2)=nd1
                   nd1=name2(catom1)
                   nd2=name2(catom2)
                   name2(catom1)=nd2
                   name2(catom2)=nd1
		   dmass1=mass(catom1)
		   dmass2=mass(catom2)
		   mass(catom1)=dmass2
		   mass(catom2)=dmass1

                 end if
               end if
	      end if
            enddo                            ! looping over iiter3
	   end if
       write(20,*) 'successful switches ',nswitch,' out of ',niter3
       call flush(20)



!           change species of one atom
	   
456         nswitch1=0
            do iiter4=1,niter4

211           rdum=ran3(seed)*natom
              catom1=int(rdum)+1
              if (catom1.lt.1.or.catom1.gt.natom) go to 211


!              set energy and species before calling en_ter
               e2=0.0
               e3=0.0
               s1i=satom(catom1)
               if (s1i.eq.1) then
                s1f=2
               else if (s1i.eq.2) then
                s1f=1
               end if

!              write(20,*) 'attempt species switch ',s1i,' to ',s1f

               call en0_ter

!               write(20,*) 'energy change ',e2+e3

               if (s1f.eq.1) then
                del_mu=mu_si-mu_ge
               else
                del_mu=mu_ge-mu_si
               end if

               if (e2+e3-del_mu.lt.0) then  ! switch occurs
                satom(catom1)=s1f
                nswitch1=nswitch1+1
                if (s1f.eq.1) then
                 name1(catom1)='SI'
                 name2(catom1)='Si'
		 mass(catom1)=mass1
                 nsi=nsi+1
                 nge=nge-1
                else
                 name1(catom1)='GE'
                 name2(catom1)='Ge'
		 mass(catom1)=mass2
                 nsi=nsi-1
                 nge=nge+1
                end if

               else
                 rdum=ran3(seed)
                 pdum=exp(-(e2+e3-del_mu)/beta1)
!                 write(20,*) 'rdum pdum',rdum,pdum
                 if (rdum.lt.pdum) then      !  switch occurs
                   satom(catom1)=s1f
                   nswitch1=nswitch1+1

                   if (s1f.eq.1) then
                    name1(catom1)='SI'
                    name2(catom1)='Si'
		    mass(catom1)=mass1
                    nsi=nsi+1
                    nge=nge-1
                   else
                    name1(catom1)='GE'
                    name2(catom1)='Ge'
		    mass(catom1)=mass2
                    nsi=nsi-1
                    nge=nge+1
                   end if

                 end if
               end if

            enddo                            ! looping over iiter4
       write(20,*) 'species switches ',nswitch1,' out of ',niter4
       call flush(20)


       rewind 12

       write(12,21)'!BIOSYM archive 3'
       write(12,22)'PBC=ON'
       write(12,*)' '
       write(12,24)'!DATE Wed Jun 30 10:08:45 1999'
       write(12,25) 'PBC',ncellx*lattx,ncelly*latty,
     &                    ncellz*lattz,90.0,90.0,90.0,'(P1)'

!      writing out a .car file
       do i=1,natom
          write(12,12) name1(i),xpos(i),ypos(i),zpos(i),
     &    '0000 1      ?       ',name2(i),0.0
       enddo

       write(12,13) 'end'
       write(12,13) 'end'

       call flush(12)



!      writing out distribution for Ge atoms

       do i=1,nstep
         ncount(i)=0
       enddo

       do iatom=1,natom
          if (satom(iatom).eq.2) then
	   zdum=zpos(iatom)/stepz
           kdum=int(zdum)+1
           ncount(kdum)=ncount(kdum)+1
	  end if          
       end do

       write(60,61) (ncount(i),i=1,nstep)
61     format(1x,200(i5,1x))


!      writing out distribution for Si atoms

       do i=1,nstep
         ncount(i)=0
       enddo

       do iatom=1,natom  
           if(satom(iatom).eq.1)then
	   zdum=zpos(iatom)/stepz
	   kdum=int(zdum)+1
	   ncount(kdum)=ncount(kdum)+1
	  end if
       enddo

       write(62,63) (ncount(i),i=1,nstep)
63     format(1x,200(i5,1x))
     
          
!       check if run needs to be stopped
        open(51,file='STOP',status='old')
        read(51,*) nstop
        close(51)
        if (nstop.lt.iiter1) go to 911

       

       write(777,555) nsi,nge 
       CALL FLUSH(777) 
555    format (1x,I5,5x,I5)

       
       
       enddo                            ! looping over iiter1
       close(12)


       




!      writing out bath atoms at the end of run
911    write(23,21)'!BIOSYM archive 3'
       write(23,22)'PBC=ON'
       write(23,*)' '
       write(23,24)'!DATE Wed Jun 30 10:08:45 1999'
       write(23,25) 'PBC',ncellx*lattx,ncelly*latty,
     &                    ncellz*lattz,90.0,90.0,90.0,'(P1)'

!      writing out a .car file for the bath atoms
       do idum=1,nbath
          i=ibath(idum)
          write(23,12) name1(i),xpos(i),ypos(i),zpos(i),
     &    '0000 1      ?       ',name2(i),0.0
       enddo

       write(23,13) 'end'
       write(23,13) 'end'

       call flush(23)

       write(20,*) 'lowest energy ',elo


            stop
            end
             


        SUBROUTINE rangauss(xdum,ydum)

        integer, parameter :: r8_kind=kind(0.d0)
        integer, parameter :: i15_kind=selected_int_kind(15)

        integer  seed
        real(r8_kind) ran3

!       this subroutine returns random numbers
!       distributed as exp(-x^2)

        real(r8_kind)     tpi,xdum,ydum
        real(r8_kind)     wdum,tdum,zdum

        pi=acos(-1.0)
        tpi=2.0*pi

        tdum=ran3(seed)*tpi
10      zdum=ran3(seed)
        if (zdum.eq.1.0) goto 10
        wdum=sqrt(-log(1.0-zdum))
        xdum=wdum*cos(tdum)
        ydum=wdum*sin(tdum)

        return
        END SUBROUTINE rangauss



      FUNCTION ran3(idum)
      INTEGER idum
      integer, parameter :: r8_kind=kind(0.d0)
      INTEGER MBIG,MSEED,MZ
C     REAL MBIG,MSEED,MZ
      REAL(r8_kind) ran3,FAC
      PARAMETER (MBIG=1000000000,MSEED=161803398,MZ=0,FAC=1./MBIG)
C     PARAMETER (MBIG=4000000.,MSEED=1618033.,MZ=0.,FAC=1./MBIG)
      INTEGER i,iff,ii,inext,inextp,k
      INTEGER mj,mk,ma(55)
C     REAL mj,mk,ma(55)
      SAVE iff,inext,inextp,ma
      DATA iff /0/
      if(idum.lt.0.or.iff.eq.0)then
        iff=1
        mj=abs(MSEED-abs(idum))
        mj=mod(mj,MBIG)
        ma(55)=mj
        mk=1
        do 11 i=1,54
          ii=mod(21*i,55)
          ma(ii)=mk
          mk=mj-mk
          if(mk.lt.MZ)mk=mk+MBIG
          mj=ma(ii)
11      continue
        do 13 k=1,4
          do 12 i=1,55
            ma(i)=ma(i)-ma(1+mod(i+30,55))
            if(ma(i).lt.MZ)ma(i)=ma(i)+MBIG
12        continue
13      continue
        inext=0
        inextp=31
        idum=1
      endif
      inext=inext+1
      if(inext.eq.56)inext=1
      inextp=inextp+1
      if(inextp.eq.56)inextp=1
      mj=ma(inext)-ma(inextp)
      if(mj.lt.MZ)mj=mj+MBIG
      ma(inext)=mj
      ran3=mj*FAC
      return
      END




