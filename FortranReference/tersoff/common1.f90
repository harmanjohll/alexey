
       module common1


	integer, parameter :: r8_kind=kind(0.d0)
	integer, parameter :: i15_kind=selected_int_kind(15)


!  smallnum is used as zero in pot_mvfv to check
!  if 3 atoms are along a straight line during a dihedral computation    
        real(r8_kind) smallnum
        parameter (smallnum=1e-8)

!   constants
        real(r8_kind) pi
  

!  physical parameters
        real(r8_kind) beta1,beta2,e2,e3,e4,e4o

        real(r8_kind) mu_si,mu_ge,del_mu

!       variables to control motion 
        real(r8_kind) epsilon,epsilon0,dtime,time
        real(r8_kind) mtime,dtime0,dispcut

        real(r8_kind) temp,vscale,avekin,avekinbath



! supercell
        integer    ncellx,ncelly,ncellz
        parameter (ncellx=1,ncelly=1,ncellz=5) 



! number of cells in slab; watch x and y directions

        integer    ncellxi,ncellyi,ncellzi
        integer    ncellxf,ncellyf,ncellzf

        parameter (ncellxi=1,ncellyi=1,ncellzi=2)
        parameter (ncellxf=1,ncellyf=1,ncellzf=4) 


        real(r8_kind) lattx,latty,lattz,totlx,totly,totlz

!       0.1 Ge
!       parameter (lattx=7.7121)
!       parameter (latty=7.7121)
!       parameter (lattz=5.4532782)

!       0.3 Ge
!       parameter (lattx=7.7763)
!       parameter (latty=7.7763)
!       parameter (lattz=5.4986745)
	
!	Diamond
!	parameter (lattx=5.431)
!	parameter (latty=5.431)
!	parameter (lattz=5.431)

!	0.2 Ge
	parameter (lattx=7.74431832)
	parameter (latty=7.74431832)
	parameter (lattz=5.47606)



!       Silicon parameters
!        parameter (lattx=7.680169593)
!        parameter (latty=7.680169593)
!        parameter (lattz=5.430700)

!       Germanium parameters
!       parameter (lattx=8.000913229)
!       parameter (latty=8.000913229)
!       parameter (lattz=5.657500)



       integer  maxbox,tatom,bxmax,bymax,bzmax
       parameter (bxmax=9,bymax=9,bzmax=25)
       parameter (maxbox=bxmax*bymax*bzmax,tatom=1000,maxat=30)


!      seed used in ran3
        integer   seed




! for 100 surface slab with x-axis along dimer row
!               y-axis along dimer bond
!               z-axis perpendicular to the 100 surface
!               lattx=2 * 3.84    
!               latty=2 * 3.84
!               lattz=5.431
!        this supercell contains 5 layers, one dimer pair
!                       and one dimer row
!       disp is the displacement of the dimer atoms to form dimers
!       dispz is the displacement in the direction perpendicular to the surface
        real(r8_kind) disp,dispz
        parameter (disp=0.745,dispz=0.1)


! 111 surface slab
!               lattx=6.651
!               latty=7.680
!               lattz=9.406
! supercell contains 6 layers n the direction perpendicular to the surface

! number of cells in cluster sc geometry



!       diamond lattx=5.431
!       volume per atom = 20.02393


!       wurtzite
!       wurtzite bulk
!       Si-Si bond length 2.352   ! this parameter used only in the wurtzite structure
        real(r8_kind) bond
        parameter (bond=2.352)
!        parameter (lattx=6.34666667)    !    2.353*8.0/3.0)
!        parameter (latty=3.88652373)    !    2.353*2.0*sqrt(2.0/3.0))
!        parameter (lattz=6.73165656)    !    2.353*2.0*sqrt(2.0))


!       fcc  V/V0=1 lattx = latty = lattz = 4.31
!       bcc  V/V0=1 lattx = latty = lattz = 3.4213
!       sc   V/V0=1 lattx = latty = lattz = 2.7155


        parameter (totlx=ncellx*lattx)
        
        parameter (totly=ncelly*latty)

        parameter (totlz=ncellz*lattz)
        


!      maxat = maximum number of atoms in each box
!           compute maxat using the box volume and the density
!              to decides the array sizes
!            iatbox(maxat,maxbox)
!      the density of silicon is about 20.024 cubic angstrom per atom







! atoms
        integer    natom,tpair,ttrip,watom,sbox
        parameter  (tpair=2500,ttrip=150000)

        character(2)    name1(tatom),name2(tatom),nd1,nd2
        integer         satom(tatom),nstep
        real(r8_kind)   stepz
        parameter  (nstep=200)
        integer         catom1,catom2,s1i,s2i,s1f,s2f

        integer         batom(tatom)
        integer         nbath,ibath(tatom)
        real(r8_kind)   zbathlo,zbathhi,wbath

        real(r8_kind)   xpos(tatom),ypos(tatom),zpos(tatom)
        real(r8_kind)   xfor(tatom),yfor(tatom),zfor(tatom)
        real(r8_kind)   xvel(tatom),yvel(tatom),zvel(tatom)
        real(r8_kind)   xacc(tatom),yacc(tatom),zacc(tatom)
        real(r8_kind)   xshf(tatom),yshf(tatom),zshf(tatom)

        real(r8_kind)   dxpos(tatom),dypos(tatom),dzpos(tatom)
        real(r8_kind)   dxfor(tatom),dyfor(tatom),dzfor(tatom)
        real(r8_kind)   dxvel(tatom),dyvel(tatom),dzvel(tatom)
        real(r8_kind)   dxacc(tatom),dyacc(tatom),dzacc(tatom)

        real(r8_kind)   mass(tatom)

! boxes
        integer  xbox(maxbox),ybox(maxbox),zbox(maxbox)
        integer  nbox,xnbox,ynbox,znbox,natbox(maxbox)
        integer  indbox(bxmax,bymax,bzmax),iatbox(maxat,maxbox)
        integer  wbatom(tatom),ibatom(tatom)
        integer  npair,ibxp(2,maxbox*26),ibox
        integer  nbxp(maxbox),wbxp(26,maxbox)

        real(r8_kind) cellx,celly,cellz
    


! potential (mfvf)
!        real(r8_kind)   rcut,alpha,gamma,a,b,q,lamb3,lamb4,olamb4

! potential (Brenner-Garrison)
!        real(r8_kind)   a,b,acap,a1,a2,d1,d2,rcut,qcut,gamma2,gamma3
! for silicon in PRB34, 1304 (1986)
!    a=1.357 A
!    b=3.33 A^-2
!    acap=97013 eV
!    a1=0.399 eV/A^2
!    a2=0.157 eV/A^2
!    d1=3.0034 A^2
!    d2=1.2877 A^2
!    rcut=3.65 A
!    qcut=6.73 A^2
!    gamma2=qcut/d2

! potential (modified Stillinger-Weber)

!         real(r8_kind) eps,sigma,acap,bcap,b,c,kappa
!         real(r8_kind) zeta,rcut,gamma,lambda,rrcut

!    Surface Science 366, 177 (1996)
!    acap = 6.8932
!    bcap = 0.3535
!    epsilon = 2.1672 eV
!    sigma = 2.0951 A
!    zeta = 0.7872
!    rcut = 1.8
!    lambda = 21.0
!    b = 0.0980
!    c = -0.0324
!    gamma = 0.5778
!    k = 0.0500 


!   potential (Tersoff)
!   PRB 39, 5566 (1988)

         real(r8_kind) d(2),c(2),h(2),beta(2),nexp(2),chi(2,2)
         real(r8_kind) omega(2,2),rcut,rcutsmall
         real(r8_kind) acap(2,2),bcap(2,2),lambij(2,2),muij(2,2)
         real(r8_kind) rcap(2,2),scap(2,2)
         real(r8_kind) ai(2),bi(2),li(2),mi(2),ri(2),si(2)
    


       end module


